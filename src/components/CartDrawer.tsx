import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag, CheckCircle2, ArrowLeft, Loader2, LogIn, MapPin, Store } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { useCountry } from '../context/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import AddressAutocomplete from './AddressAutocomplete';
import DeliveryMapPreview from './DeliveryMapPreview';
import StoreLocator, { STORE_LOCATIONS, StoreLocation } from './StoreLocator';
import DeliveryAvailabilityNotice from './DeliveryAvailabilityNotice';
import InternationalOrderModal from './InternationalOrderModal';
import { SHIPPING_AVAILABILITY } from '@/lib/deliveryZones';
import { normalizePhoneE164 } from '@/lib/phone';
import { trackBeginCheckout, trackPurchase } from '@/lib/analytics';
import { formatSizeDisplay } from '../constants';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type CheckoutStep = 'cart' | 'auth' | 'processing' | 'success' | 'pending';

function getCartKey(id: string, size?: string, color?: string) {
  return `${id}-${size || ''}-${color || ''}`;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart, deliveryZone, setDeliveryZone, deliveryFee, grandTotal, discountAmount } = useCart();
  const { formatPrice, selectedCountry, user, login, signup, countries } = useCountry();
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const submittingRef = useRef(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });
  const [isStoreLocatorOpen, setIsStoreLocatorOpen] = useState(false);
  const [isIntlOpen, setIsIntlOpen] = useState(false);
  const [selectedPickupStore, setSelectedPickupStore] = useState<StoreLocation>(STORE_LOCATIONS[0]);

  // Auth / Guest form state
  const [authTab, setAuthTab] = useState<'guest' | 'login' | 'signup'>('guest');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authCountryId, setAuthCountryId] = useState(1);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<{ orderId?: string; orderNumber?: string; phone?: string } | null>(null);

  // Listen for global open store locator event
  useEffect(() => {
    const handleOpenStoreLocator = () => setIsStoreLocatorOpen(true);
    window.addEventListener('ab_open_store_locator', handleOpenStoreLocator);
    return () => window.removeEventListener('ab_open_store_locator', handleOpenStoreLocator);
  }, []);

  // Check for payment success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;

    const lastOrder = sessionStorage.getItem('ab_last_order');
    sessionStorage.removeItem('ab_last_order');
    // Clean URL immediately so a refresh cannot replay this state
    window.history.replaceState({}, '', window.location.pathname);

    let parsed: any = null;
    try {
      parsed = lastOrder ? JSON.parse(lastOrder) : null;
    } catch {
      parsed = null;
    }

    if (!parsed?.orderId) {
      setStep('cart');
      return;
    }

    setStep('processing');
    setPaymentVerifying(true);

    // Never claim success on the gateway redirect alone — confirm with our own records
    const verify = async () => {
      for (let attempt = 0; attempt < 6; attempt++) {
        const { data, error } = await supabase.functions.invoke('order-lookup', {
          body: { action: 'status', orderId: parsed.orderId },
        });
        if (!error && data?.success) {

          const paymentStatus = String(data.payment_status || '').toLowerCase();
          if (paymentStatus === 'paid') {
            setLastOrderDetails({
              orderId: parsed.orderId,
              orderNumber: data.order_number || parsed.orderNumber,
              phone: parsed.phone,
            });
            try {
              trackPurchase(parsed.orderId, parsed.items, parsed.value, parsed.currency, parsed.shipping);
            } catch (e) {
              console.error('Purchase tracking failed', e);
            }
            setPaymentVerifying(false);
            setStep('success');
            return;
          }
          if (['failed', 'cancelled'].includes(paymentStatus)) {
            setPaymentVerifying(false);
            setStep('cart');
            toast({
              title: 'Payment not completed',
              description: 'We did not receive your payment. Nothing has been charged — please try again.',
              variant: 'destructive',
            });
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      // Still pending after retries: confirmation is in progress, never shown as paid
      setPaymentVerifying(false);
      setLastOrderDetails({
        orderId: parsed.orderId,
        orderNumber: parsed.orderNumber,
        phone: parsed.phone,
      });
      setStep('pending');
    };

    verify();
  }, []);

  const handleCheckout = async (guestDetails?: { name: string; email: string; phone: string }) => {
    // Hard guard against double submission (refs update synchronously, state does not)
    if (submittingRef.current) return;
    // The gateway only accepts valid TZ/KE/UG mobile money numbers — collect a usable one
    // before creating an order, so no payment attempt (or stranded order) is wasted.
    const phoneCandidate = user?.phone_number || guestDetails?.phone || guestPhone || '';
    if (!normalizePhoneE164(phoneCandidate)) {
      setAuthTab('guest');
      setGuestName(prev => prev || user?.full_name || '');
      setGuestEmail(prev => prev || user?.email || '');
      setGuestPhone(prev => prev || phoneCandidate);
      setAuthError('Please enter a valid Tanzanian, Kenyan or Ugandan mobile money number (e.g., 0712 345 678)');
      setStep('auth');
      return;
    }
    submittingRef.current = true;
    setCheckoutLoading(true);
    setStep('processing');
    const currency = selectedCountry?.currency_code || 'TZS';
    trackBeginCheckout(cart, grandTotal, currency);

    const finalAddress = deliveryZone === 'pickup'
      ? `STORE PICKUP: ${selectedPickupStore.name} (${selectedPickupStore.address})`
      : deliveryAddress;
    const finalLat = deliveryZone === 'pickup' ? selectedPickupStore.coordinates.lat : deliveryCoords.latitude;
    const finalLng = deliveryZone === 'pickup' ? selectedPickupStore.coordinates.lng : deliveryCoords.longitude;

    const cName = user?.full_name || guestDetails?.name || guestName || 'Guest Customer';
    const cEmail = user?.email || guestDetails?.email || guestEmail || '';
    const rawPhone = user?.phone_number || guestDetails?.phone || guestPhone || '';
    const cPhone = normalizePhoneE164(rawPhone)!;

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
          })),
          totalAmount: cartTotal,
          discountAmount,
          deliveryFee,
          grandTotal,
          deliveryZone,
          currency,
          customerName: cName,
          customerEmail: cEmail,
          customerPhone: cPhone,
          isGuest: !user,
          deliveryAddress: finalAddress,
          deliveryLatitude: finalLat,
          deliveryLongitude: finalLng,
          redirectUrl: window.location.origin + '/?payment=success',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Payment creation failed');

      sessionStorage.setItem(
        'ab_last_order',
        JSON.stringify({
          orderId: data.order_id,
          orderNumber: data.order_number || data.order_id?.slice(0, 8),
          phone: cPhone,
          items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category, selectedSize: i.selectedSize, selectedColor: i.selectedColor })),
          value: grandTotal,
          currency,
          shipping: deliveryFee,
        })
      );
      clearCart();
      window.location.href = data.checkout_url;
    } catch (err: any) {
      console.error('Checkout error:', err);
      submittingRef.current = false;
      setStep('cart');
      toast({
        title: 'Payment Error',
        description: err.message || 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckoutClick = () => {
    if (!user) {
      setStep('auth');
    } else {
      handleCheckout();
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setAuthError('Please enter your full name');
      return;
    }
    const normalizedPhone = normalizePhoneE164(guestPhone);
    if (!normalizedPhone) {
      setAuthError('Please enter a Tanzanian, Kenyan or Ugandan mobile money number (e.g., 0712 345 678)');
      return;
    }
    setAuthError('');
    handleCheckout({ name: guestName, email: guestEmail, phone: normalizedPhone });
  };

  const handleAuthLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const success = await login(authEmail, authPassword);
    if (success) {
      handleCheckout();
    } else {
      setAuthError('Invalid credentials');
    }
    setAuthLoading(false);
  };

  const handleAuthSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    const success = await signup({ full_name: authName, email: authEmail, phone_number: authPhone, password: authPassword, country_id: authCountryId });
    if (success) {
      handleCheckout();
    } else {
      setAuthError('Signup failed. Please try again.');
    }
    setAuthLoading(false);
  };

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setStep('cart');
      setAuthError('');
      setAuthTab('guest');
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-popover z-[70] shadow-2xl flex flex-col border-l border-foreground/5"
          >
            <div className="p-6 border-b border-foreground/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step === 'auth' ? (
                  <button onClick={() => setStep('cart')} className="p-1 hover:text-primary transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                ) : (
                  <ShoppingBag className="text-primary" size={24} />
                )}
                <h2 className="text-xl font-black italic tracking-tight uppercase">
                  {step === 'cart' ? 'Your ' : step === 'auth' ? 'Express ' : step === 'success' ? 'Order ' : 'Processing '}
                  <span className="text-primary">
                    {step === 'cart' ? 'Cart' : step === 'auth' ? 'Checkout' : step === 'success' ? 'Confirmed' : '...'}
                  </span>
                </h2>
              </div>
              <button onClick={resetAndClose} className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              <AnimatePresence mode="wait">
                {step === 'cart' && (
                  <motion.div key="cart-view" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                    {cart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                        <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag size={40} />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Your cart is empty</p>
                      </div>
                    ) : (
                      cart.map(item => {
                        const key = getCartKey(item.id, item.selectedSize, item.selectedColor);
                        return (
                          <div key={key} className="flex gap-4 bg-card rounded-2xl p-4 border border-foreground/5">
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm truncate">{item.name}</h4>
                              {(item.selectedSize || item.selectedColor) && (
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                                  {[item.selectedColor, item.selectedSize ? formatSizeDisplay(item.selectedSize) : null].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              <p className="text-primary font-bold text-sm mt-1">{formatPrice(item.price)}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <button onClick={() => updateQuantity(key, -1)} className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center hover:bg-foreground/10">
                                  <Minus size={14} />
                                </button>
                                <span className="text-sm font-black">{item.quantity}</span>
                                <button onClick={() => updateQuantity(key, 1)} className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center hover:bg-foreground/10">
                                  <Plus size={14} />
                                </button>
                                <button onClick={() => removeFromCart(key)} className="ml-auto p-1 text-muted-foreground hover:text-destructive">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                )}

                {step === 'auth' && (
                  <motion.div key="auth-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    {/* Tab Navigation */}
                    <div className="grid grid-cols-3 gap-1 bg-secondary/60 p-1 rounded-2xl border border-foreground/5">
                      <button
                        onClick={() => { setAuthTab('guest'); setAuthError(''); }}
                        className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                          authTab === 'guest' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Guest
                      </button>
                      <button
                        onClick={() => { setAuthTab('login'); setAuthError(''); }}
                        className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                          authTab === 'login' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => { setAuthTab('signup'); setAuthError(''); }}
                        className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                          authTab === 'signup' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Register
                      </button>
                    </div>

                    {authTab === 'guest' && (
                      <form onSubmit={handleGuestSubmit} className="space-y-4">
                        <div className="text-center space-y-1 mb-4">
                          <h4 className="text-sm font-black uppercase tracking-tight">Guest Checkout</h4>
                          <p className="text-[11px] text-muted-foreground">No account required. Enter details for order updates.</p>
                        </div>
                        <input
                          type="text"
                          placeholder="Full Name *"
                          value={guestName}
                          onChange={e => setGuestName(e.target.value)}
                          required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
                        />
                        <div>
                          <input
                            type="tel"
                            placeholder="Phone Number *"
                            value={guestPhone}
                            onChange={e => setGuestPhone(e.target.value)}
                            required
                            className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
                          />
                          <div className="mt-1.5">
                            <DeliveryAvailabilityNotice variant="compact" />
                          </div>
                        </div>
                        <input
                          type="email"
                          placeholder="Email Address (Optional)"
                          value={guestEmail}
                          onChange={e => setGuestEmail(e.target.value)}
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
                        />
                        {authError && <p className="text-destructive text-xs font-bold text-center">{authError}</p>}
                        <button
                          type="submit"
                          disabled={checkoutLoading}
                          className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {checkoutLoading ? 'PROCEEDING...' : 'CONTINUE AS GUEST'}
                        </button>
                      </form>
                    )}

                    {authTab === 'login' && (
                      <form onSubmit={handleAuthLogin} className="space-y-4">
                        <div className="text-center space-y-1 mb-4">
                          <h4 className="text-sm font-black uppercase tracking-tight">Sign In to Your Account</h4>
                        </div>
                        <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                        <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                        {authError && <p className="text-destructive text-xs font-bold text-center">{authError}</p>}
                        <button type="submit" disabled={authLoading}
                          className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                          {authLoading ? 'SIGNING IN...' : 'SIGN IN & CHECKOUT'}
                        </button>
                      </form>
                    )}

                    {authTab === 'signup' && (
                      <form onSubmit={handleAuthSignup} className="space-y-4">
                        <div className="text-center space-y-1 mb-4">
                          <h4 className="text-sm font-black uppercase tracking-tight">Create an Account</h4>
                        </div>
                        <input type="text" placeholder="Full Name" value={authName} onChange={e => setAuthName(e.target.value)} required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                        <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                        <input type="tel" placeholder="Phone Number" value={authPhone} onChange={e => setAuthPhone(e.target.value)} required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                        <select value={authCountryId} onChange={e => setAuthCountryId(Number(e.target.value))}
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all appearance-none">
                          {countries.map(c => <option key={c.id} value={c.id}>{c.flag_emoji} {c.name} ({c.currency_code})</option>)}
                        </select>
                        {selectedCountry && !SHIPPING_AVAILABILITY.shippingCountries.some((c) =>
                          (selectedCountry.name || '').toLowerCase().includes(c.toLowerCase())
                        ) && (
                          <DeliveryAvailabilityNotice variant="compact" />
                        )}
                        <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                        {authError && <p className="text-destructive text-xs font-bold text-center">{authError}</p>}
                        <button type="submit" disabled={authLoading}
                          className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                          {authLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT & CHECKOUT'}
                        </button>
                      </form>
                    )}
                  </motion.div>
                )}

                {step === 'processing' && (
                  <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                    <Loader2 className="text-primary animate-spin" size={48} />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {paymentVerifying ? 'Confirming your payment...' : 'Setting up your payment...'}
                    </p>
                  </motion.div>
                )}

                {step === 'pending' && (
                  <motion.div key="pending" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                    <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center border border-foreground/10">
                      <Loader2 size={36} className="text-primary animate-spin" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black italic uppercase">Awaiting Confirmation</h3>
                      <p className="text-muted-foreground text-sm">
                        Your order has been placed and we are still waiting for the payment confirmation. You will receive an update shortly — do not pay again.
                      </p>
                      {lastOrderDetails?.orderNumber && (
                        <div className="p-3 bg-secondary rounded-xl border border-foreground/10 text-xs font-bold font-mono text-primary">
                          Order #{lastOrderDetails.orderNumber}
                        </div>
                      )}
                    </div>
                    <div className="w-full space-y-2 pt-4">
                      {lastOrderDetails?.orderNumber && (
                        <a
                          href={`/track-order?order_number=${encodeURIComponent(lastOrderDetails.orderNumber)}&phone=${encodeURIComponent(lastOrderDetails.phone || '')}`}
                          className="w-full block py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl text-center hover:opacity-90"
                        >
                          Check Order Status
                        </a>
                      )}
                      <button onClick={resetAndClose} className="w-full py-3 bg-secondary text-foreground font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-secondary/80">
                        Continue Shopping
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                      <CheckCircle2 size={40} className="text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black italic uppercase">Payment Successful!</h3>
                      <p className="text-muted-foreground text-sm">Thank you for your order. Your tracking details are below.</p>
                      {lastOrderDetails?.orderNumber && (
                        <div className="p-3 bg-secondary rounded-xl border border-foreground/10 text-xs font-bold font-mono text-primary">
                          Order #{lastOrderDetails.orderNumber}
                        </div>
                      )}
                    </div>
                    <div className="w-full space-y-2 pt-4">
                      {lastOrderDetails?.orderNumber && (
                        <a
                          href={`/track-order?order_number=${encodeURIComponent(lastOrderDetails.orderNumber)}&phone=${encodeURIComponent(lastOrderDetails.phone || '')}`}
                          className="w-full block py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl text-center hover:opacity-90"
                        >
                          Track Your Order
                        </a>
                      )}
                      <button onClick={resetAndClose} className="w-full py-3 bg-secondary text-foreground font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-secondary/80">
                        Continue Shopping
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {step === 'cart' && cart.length > 0 && (
              <div className="p-6 border-t border-foreground/5 space-y-4">
                {/* Delivery Zone Options */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fulfillment Method</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setDeliveryZone('inside_dar')}
                      className={`py-2 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider border-2 transition-all text-center ${
                        deliveryZone === 'inside_dar'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-foreground/10 text-muted-foreground hover:border-foreground/20'
                      }`}
                    >
                      Inside Dar
                      <span className="block text-[8px] font-normal opacity-80">{formatPrice(3000)}</span>
                    </button>
                    <button
                      onClick={() => setDeliveryZone('outside_dar')}
                      className={`py-2 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider border-2 transition-all text-center ${
                        deliveryZone === 'outside_dar'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-foreground/10 text-muted-foreground hover:border-foreground/20'
                      }`}
                    >
                      Other Regions
                      <span className="block text-[8px] font-normal opacity-80">{formatPrice(10000)}</span>
                    </button>
                    <button
                      onClick={() => setDeliveryZone('pickup')}
                      className={`py-2 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider border-2 transition-all text-center ${
                        deliveryZone === 'pickup'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-foreground/10 text-muted-foreground hover:border-foreground/20'
                      }`}
                    >
                      Store Pickup
                      <span className="block text-[8px] font-normal text-emerald-500">FREE</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Address OR Store Pickup Card */}
                {deliveryZone === 'pickup' ? (
                  <div className="p-3 bg-card border border-primary/20 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                        <Store size={12} /> Pickup Store Selected
                      </span>
                      <button
                        onClick={() => setIsStoreLocatorOpen(true)}
                        className="text-[9px] font-black uppercase tracking-widest text-primary underline hover:opacity-80"
                      >
                        Change Store
                      </button>
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase">{selectedPickupStore.name}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">{selectedPickupStore.address}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delivery Address</span>
                    <AddressAutocomplete
                      value={deliveryAddress}
                      onChange={setDeliveryAddress}
                      onResolved={({ address, latitude, longitude }) => {
                        setDeliveryAddress(address);
                        setDeliveryCoords({ latitude, longitude });
                      }}
                      regionCode={selectedCountry?.code || 'TZ'}
                    />
                    <DeliveryMapPreview
                      latitude={deliveryCoords.latitude}
                      longitude={deliveryCoords.longitude}
                      address={deliveryAddress}
                      onLocationChange={({ latitude, longitude }) => setDeliveryCoords({ latitude, longitude })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subtotal ({cartCount} items)</span>
                    <span className="text-sm font-bold">{formatPrice(cartTotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Combo Saving</span>
                      <span className="text-sm font-bold text-primary">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delivery</span>
                    <span className="text-sm font-bold">{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-foreground/10">
                    <span className="text-xs font-black uppercase tracking-widest">Total</span>
                    <span className="text-xl font-black text-primary">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                {/* Tanzania-only delivery notice — shown right before payment */}
                <DeliveryAvailabilityNotice />

                <button
                  onClick={handleCheckoutClick}
                  disabled={checkoutLoading}
                  className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
                >
                  {checkoutLoading ? 'PROCESSING...' : '🇹🇿 TANZANIA — PROCEED TO CHECKOUT'}
                </button>
                <button
                  onClick={() => setIsIntlOpen(true)}
                  className="w-full py-3.5 border border-primary/40 text-foreground font-black tracking-widest text-xs rounded-2xl hover:border-primary hover:text-primary transition-all"
                >
                  🌍 INTERNATIONAL — REQUEST INTERNATIONAL SHIPPING
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Global & Checkout Store Locator Modal */}
      <StoreLocator
        isOpen={isStoreLocatorOpen}
        onClose={() => setIsStoreLocatorOpen(false)}
        onSelectStore={(store) => {
          setSelectedPickupStore(store);
          setDeliveryZone('pickup');
          setIsStoreLocatorOpen(false);
        }}
        selectedStoreId={selectedPickupStore.id}
      />
      <InternationalOrderModal key="intl-modal" isOpen={isIntlOpen} onClose={() => setIsIntlOpen(false)} />
    </AnimatePresence>
  );
}
