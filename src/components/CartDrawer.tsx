import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag, CheckCircle2, ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import { useCountry } from '../context/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type CheckoutStep = 'cart' | 'auth' | 'payment' | 'processing' | 'success';

const PAYMENT_METHODS_TZ = [
  { id: 'vodacom', name: 'VODACOM M-PESA', icon: Smartphone, color: 'text-red-600' },
  { id: 'yas', name: 'TIGO PESA / YAS', icon: Smartphone, color: 'text-blue-600' },
  { id: 'airtel', name: 'AIRTEL MONEY', icon: Smartphone, color: 'text-red-500' },
  { id: 'halotel', name: 'HALOPESA', icon: Smartphone, color: 'text-orange-500' },
  { id: 'bank_tz', name: 'LOCAL BANK TRANSFER', icon: Landmark, color: 'text-primary' },
];

const PAYMENT_METHODS_NG = [
  { id: 'nibss', name: 'BANK TRANSFER (NIBSS)', icon: Landmark, color: 'text-emerald-600' },
  { id: 'opay', name: 'OPAY', icon: Wallet, color: 'text-emerald-500' },
  { id: 'palmpay', name: 'PALMPAY', icon: Wallet, color: 'text-purple-500' },
  { id: 'kuda', name: 'KUDA BANK', icon: Smartphone, color: 'text-indigo-500' },
  { id: 'moniepoint', name: 'MONIEPOINT', icon: Landmark, color: 'text-blue-500' },
];

function getCartKey(id: string, size?: string, color?: string) {
  return `${id}-${size || ''}-${color || ''}`;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart, deliveryZone, setDeliveryZone, deliveryFee, grandTotal } = useCart();
  const { formatPrice, selectedCountry, user, login, signup, countries } = useCountry();
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Auth form state
  const [isSignup, setIsSignup] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authCountryId, setAuthCountryId] = useState(1);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const paymentMethods = selectedCountry?.code === 'NG' ? PAYMENT_METHODS_NG : PAYMENT_METHODS_TZ;

  const handleCheckoutClick = () => {
    if (!user) {
      setStep('auth');
    } else {
      handleCheckout();
    }
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

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setStep('processing');
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
          deliveryFee,
          grandTotal,
          deliveryZone,
          currency: selectedCountry?.currency_code || 'TZS',
          customerName: user?.full_name || '',
          customerEmail: user?.email || '',
          customerPhone: user?.phone_number || '',
          redirectUrl: window.location.origin + '/?payment=success',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Payment creation failed');

      // Redirect to Snippe hosted checkout
      clearCart();
      window.location.href = data.checkout_url;
    } catch (err: any) {
      console.error('Checkout error:', err);
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

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setStep('cart');
      setSelectedMethod(null);
      setPhoneNumber('');
      setAuthError('');
      setIsSignup(false);
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
                {(step === 'payment' || step === 'auth') ? (
                  <button onClick={() => setStep('cart')} className="p-1 hover:text-primary transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                ) : (
                  <ShoppingBag className="text-primary" size={24} />
                )}
                <h2 className="text-xl font-black italic tracking-tight uppercase">
                  {step === 'cart' ? 'Your ' : step === 'auth' ? 'Sign ' : step === 'payment' ? 'Payment ' : step === 'success' ? 'Order ' : 'Processing '}
                  <span className="text-primary">
                    {step === 'cart' ? 'Cart' : step === 'auth' ? 'In' : step === 'payment' ? 'Method' : step === 'success' ? 'Success' : '...'}
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
                                  {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
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
                    <div className="text-center space-y-2">
                      <LogIn size={32} className="text-primary mx-auto" />
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Sign in to complete your order</p>
                    </div>

                    {!isSignup ? (
                      <form onSubmit={handleAuthLogin} className="space-y-4">
                        <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                        <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                        {authError && <p className="text-destructive text-xs font-bold text-center">{authError}</p>}
                        <button type="submit" disabled={authLoading}
                          className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                          {authLoading ? 'SIGNING IN...' : 'SIGN IN'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleAuthSignup} className="space-y-4">
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
                        <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required
                          className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                        {authError && <p className="text-destructive text-xs font-bold text-center">{authError}</p>}
                        <button type="submit" disabled={authLoading}
                          className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                          {authLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                        </button>
                      </form>
                    )}

                    <button onClick={() => { setIsSignup(!isSignup); setAuthError(''); }}
                      className="w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">
                      {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                  </motion.div>
                )}


                {step === 'processing' && (
                  <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                    <Loader2 className="text-primary animate-spin" size={48} />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Processing your order...</p>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black italic uppercase">Order Confirmed!</h3>
                      <p className="text-muted-foreground text-sm">Your items are on their way.</p>
                    </div>
                    <button onClick={resetAndClose} className="btn-primary text-sm uppercase tracking-widest">
                      Continue Shopping
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {step === 'cart' && cart.length > 0 && (
              <div className="p-6 border-t border-foreground/5 space-y-4">
                {/* Delivery zone selector */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delivery Zone</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeliveryZone('inside_dar')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                        deliveryZone === 'inside_dar'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-foreground/10 text-muted-foreground hover:border-foreground/20'
                      }`}
                    >
                      Inside Dar · {formatPrice(3000)}
                    </button>
                    <button
                      onClick={() => setDeliveryZone('outside_dar')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                        deliveryZone === 'outside_dar'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-foreground/10 text-muted-foreground hover:border-foreground/20'
                      }`}
                    >
                      Other Regions · {formatPrice(10000)}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subtotal ({cartCount} items)</span>
                    <span className="text-sm font-bold">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Delivery</span>
                    <span className="text-sm font-bold">{formatPrice(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-foreground/10">
                    <span className="text-xs font-black uppercase tracking-widest">Total</span>
                    <span className="text-xl font-black text-primary">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
                <button onClick={handleCheckoutClick} className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">
                  CHECKOUT
                </button>
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
