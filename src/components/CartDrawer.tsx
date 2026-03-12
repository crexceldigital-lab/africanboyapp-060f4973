import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag, Smartphone, CheckCircle2, ArrowLeft, Loader2, Landmark, Wallet, LogIn } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import { useCountry } from '../context/CountryContext';

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

  const handleCheckout = async () => {
    setStep('processing');
    await new Promise(resolve => setTimeout(resolve, 2500));
    setStep('success');
    clearCart();
  };

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setStep('cart');
      setSelectedMethod(null);
      setPhoneNumber('');
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
                {step === 'payment' ? (
                  <button onClick={() => setStep('cart')} className="p-1 hover:text-primary transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                ) : (
                  <ShoppingBag className="text-primary" size={24} />
                )}
                <h2 className="text-xl font-black italic tracking-tight uppercase">
                  {step === 'cart' ? 'Your ' : step === 'payment' ? 'Payment ' : step === 'success' ? 'Order ' : 'Processing '}
                  <span className="text-primary">
                    {step === 'cart' ? 'Cart' : step === 'payment' ? 'Method' : step === 'success' ? 'Success' : '...'}
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

                {step === 'payment' && (
                  <motion.div key="payment-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="space-y-3">
                      {paymentMethods.map(method => {
                        const Icon = method.icon;
                        return (
                          <button
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                              selectedMethod === method.id ? 'border-primary bg-primary/10' : 'border-foreground/5 bg-card hover:border-foreground/20'
                            }`}
                          >
                            <Icon size={24} className={method.color} />
                            <span className="text-xs font-black uppercase tracking-widest">{method.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedMethod && selectedMethod !== 'card' && (
                      <input
                        type="tel"
                        placeholder="Enter phone number"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none"
                      />
                    )}
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
                <button onClick={() => setStep('payment')} className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">
                  CHECKOUT
                </button>
              </div>
            )}

            {step === 'payment' && (
              <div className="p-6 border-t border-foreground/5">
                <button
                  disabled={!selectedMethod || (selectedMethod !== 'card' && !phoneNumber)}
                  onClick={handleCheckout}
                  className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                >
                  PAY NOW
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
