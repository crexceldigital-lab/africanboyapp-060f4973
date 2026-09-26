import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, X, ChevronLeft, Download, Wallet, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import FitMeCreditsModal from '../components/FitMeCreditsModal';
import { fetchWallet, FitMeWallet, verifyPaymentStatus } from '@/lib/fitmeCredits';
import { trackFitMe, trackFitMeProductSelected } from '../lib/analytics';

export default function FitMe() {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'select' | 'result'>('upload');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [wallet, setWallet] = useState<FitMeWallet>({ authenticated: false, current_balance: 0 });
  const [walletLoading, setWalletLoading] = useState(true);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<{
    type: 'success' | 'info' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatingRef = useRef(false);

  const refreshWallet = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setWallet({ authenticated: false, current_balance: 0 });
      setWalletLoading(false);
      return;
    }
    const w = await fetchWallet();
    setWallet(w);
    setWalletLoading(false);
  }, []);

  useEffect(() => {
    trackFitMe('fitme_opened');
    refreshWallet();

    // Check for Snippe payment callback URL params: ?reference=XXX or ?purchase_id=YYY
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('reference') || urlParams.get('purchase_id');
    if (refParam) {
      verifyPaymentStatus(refParam).then((res) => {
        if (res.status === 'PAID') {
          setPaymentBanner({
            type: 'success',
            title: 'Payment Confirmed!',
            message: `✨ ${res.credits_added || 'Your'} Fit Me credits have been added to your wallet.`,
          });
          toast.success('Payment verified! Credits added.');
        } else if (res.status === 'PENDING') {
          setPaymentBanner({
            type: 'info',
            title: 'Payment Processing...',
            message: 'Snippe is processing your payment. Your credits will appear automatically once completed.',
          });
          toast.info('Payment is processing. Please check back in a moment.');
        } else if (res.status === 'FAILED') {
          setPaymentBanner({
            type: 'error',
            title: 'Payment Failed',
            message: 'The payment was not completed or was cancelled.',
          });
          toast.error('Payment was not completed.');
        }
        refreshWallet();
        // Clean URL params without reloading page
        window.history.replaceState({}, '', window.location.pathname);
      }).catch((err) => {
        console.error('Payment verification error:', err);
      });
    }

    // Coming back from a credit payment — pick up the new balance
    const onFocus = () => refreshWallet();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshWallet]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProducts(data.map((p: any) => ({
          ...p,
          price: Number(p.price),
          colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
        })));
      }
    };
    fetchProducts();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUserImage(reader.result as string);
      setStep('select');
      trackFitMe('fitme_photo_uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!userImage || selectedProducts.length === 0) return;
    if (generatingRef.current || loading) return;

    if (!wallet.authenticated) {
      toast.error('Please sign in to create your look with Fit Me Credits.');
      return;
    }

    if (wallet.current_balance < 1) {
      trackFitMe('fitme_out_of_credits');
      setCreditsOpen(true);
      return;
    }

    generatingRef.current = true;
    setLoading(true);
    setResultImage(null);
    trackFitMe('fitme_generation_started', { items: selectedProducts.length });

    try {
      const productsPayload = selectedProducts.map(p => ({
        id: p.id,
        imageUrl: p.image_url,
        name: p.name,
        color: selectedColors[p.id] || undefined,
      }));

      const { data, error } = await supabase.functions.invoke('fit-me-ai', {
        body: {
          userImageBase64: userImage,
          products: productsPayload,
        },
      });

      // Edge function returned a non-2xx status: read the real reason from the body
      let payload: any = data;
      if (error && !payload) {
        try {
          payload = await (error as any)?.context?.json?.();
        } catch {
          payload = null;
        }
      }

      if (payload?.code === 'auth_required') {
        toast.error('Please sign in to use Fit Me AI.');
        return;
      }

      if (payload?.code === 'insufficient_credits') {
        trackFitMe('fitme_out_of_credits');
        setWallet((w) => ({ ...w, current_balance: payload.current_balance ?? 0 }));
        setCreditsOpen(true);
        return;
      }

      if (payload?.error) {
        if (payload.refunded) trackFitMe('fitme_credit_refunded');
        trackFitMe('fitme_generation_failed', { reason: payload.error });
        toast.error(payload.error);
        return;
      }

      if (error) throw error;

      if (payload?.image) {
        setResultImage(payload.image);
        setStep('result');
        trackFitMe('fitme_generation_completed', {
          cached: Boolean(payload.cached),
          credits_charged: payload.credits_charged ?? 1,
        });
        if (payload.credits_charged > 0) trackFitMe('fitme_credit_used', { credits: payload.credits_charged });
        if (payload.cached) toast.success('Same look as before — no credit used.');
      } else {
        trackFitMe('fitme_generation_failed', { reason: 'no_image' });
        toast.error('Could not generate image. Try a different photo.');
      }
    } catch (err: any) {
      console.error('Fit Me AI error:', err);
      trackFitMe('fitme_generation_failed', { reason: err?.message });
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      generatingRef.current = false;
      setLoading(false);
      refreshWallet();
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      const res = await fetch(resultImage);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fit-me-outfit.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Image saved!');
    } catch {
      // Fallback: open in new tab so user can long-press to save
      window.open(resultImage, '_blank');
      toast('Long-press the image to save it to your gallery');
    }
  };

  const handleReset = () => {
    setUserImage(null);
    setSelectedProducts([]);
    setSelectedColors({});
    setResultImage(null);
    setStep('upload');
  };

  // Derive unique categories
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const filteredProducts = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);
  const outOfCredits = wallet.authenticated && wallet.current_balance < 1;

  return (
    <div className="pb-24 pt-20 px-6 max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <span className="text-primary text-xs font-bold tracking-widest uppercase">AI Powered</span>
        <h1 className="text-4xl font-black tracking-tighter italic uppercase">
          FIT ME <span className="text-primary">AI</span>
        </h1>
        <p className="text-muted-foreground text-xs mt-2 uppercase tracking-widest">
          Upload your photo • Pick a product • See yourself wearing it
        </p>
      </div>

      {/* Verified Payment Status Banner */}
      {paymentBanner && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-start justify-between gap-3 ${
            paymentBanner.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : paymentBanner.type === 'info'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          <div>
            <p className="font-bold text-sm tracking-wide uppercase">{paymentBanner.title}</p>
            <p className="text-xs opacity-90 mt-0.5">{paymentBanner.message}</p>
          </div>
          <button
            onClick={() => setPaymentBanner(null)}
            className="p-1 opacity-70 hover:opacity-100 rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Fit Me Credit wallet */}
      <div className="mb-8 flex items-center justify-between gap-3 p-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Wallet size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fit Me Wallet</p>
            {walletLoading ? (
              <p className="text-sm font-black flex items-center gap-2"><Loader2 size={13} className="animate-spin text-primary" /> Loading…</p>
            ) : wallet.authenticated ? (
              <p className="text-sm font-black tracking-tight truncate">
                <span className="text-primary">✨ {wallet.current_balance}</span>{' '}
                Fit Me {wallet.current_balance === 1 ? 'Credit' : 'Credits'}
              </p>
            ) : (
              <p className="text-sm font-black tracking-tight">Sign in to see your credits</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setCreditsOpen(true)}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest flex-shrink-0 hover:scale-[1.03] active:scale-[0.97] transition-all"
        >
          Get Credits
        </button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {['Upload Photo', 'Pick Outfit', 'Your Look'].map((label, i) => {
          const stepIndex = ['upload', 'select', 'result'].indexOf(step);
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                isActive ? 'bg-primary text-primary-foreground scale-110' :
                isDone ? 'bg-primary/20 text-primary' : 'bg-card text-muted-foreground border border-foreground/10'
              }`}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] uppercase tracking-widest font-bold hidden sm:block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < 2 && <div className="w-8 h-px bg-foreground/10" />}
            </div>
          );
        })}
      </div>

      {/* Hidden file input - outside AnimatePresence */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <label
              htmlFor="fitme-upload"
              className="aspect-[3/4] max-w-xs mx-auto border-2 border-dashed border-foreground/20 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary transition-all bg-card/50 group w-full"
            >
              <input
                id="fitme-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <Camera size={28} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Tap to upload your photo</p>
                <p className="text-xs text-muted-foreground mt-1">Full body photo works best</p>
              </div>
            </label>
          </motion.div>
        )}

        {/* Step 2: Select Product */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Small photo preview with back button */}
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-20 rounded-xl overflow-hidden border-2 border-primary flex-shrink-0">
                <img src={userImage!} alt="Your photo" className="w-full h-full object-cover" />
                <button
                  onClick={handleReset}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-background/80 rounded-full flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-wider">Pick Your Outfit</p>
                <p className="text-[10px] text-muted-foreground">Select up to 5 items, then try it on</p>
              </div>
              <button
                onClick={() => setStep('upload')}
                className="py-2 px-4 bg-card border border-foreground/10 text-foreground font-black tracking-widest text-[10px] rounded-xl flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Back
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-foreground/10 text-muted-foreground hover:border-foreground/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-3 gap-3">
              {filteredProducts.map(product => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
                      } else if (selectedProducts.length < 5) {
                        setSelectedProducts(prev => [...prev, product]);
                        trackFitMeProductSelected(product);
                      } else {
                        toast.error('Max 5 items at a time');
                      }
                    }}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      isSelected ? 'border-primary scale-[0.97]' : 'border-foreground/5 hover:border-foreground/20'
                    }`}
                  >
                    <div className="aspect-[3/4]">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-[10px] font-black">✓</span>
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-[10px] font-bold truncate">{product.name}</p>
                      <p className="text-[9px] text-muted-foreground">{product.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Generation confirmation + credit cost */}
            <div className="space-y-3 pb-4">
              {selectedProducts.length > 0 && (
                <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
                  {selectedProducts.length}/5 items selected
                </p>
              )}

              {outOfCredits ? (
                <div className="p-5 rounded-2xl border border-primary/30 bg-card text-center space-y-2">
                  <p className="text-sm font-black uppercase tracking-widest">You're out of Fit Me Credits</p>
                  <p className="text-[11px] text-muted-foreground">
                    Get more credits to continue creating your looks.
                  </p>
                  <button
                    onClick={() => { trackFitMe('fitme_out_of_credits'); setCreditsOpen(true); }}
                    className="w-full mt-2 py-4 bg-primary text-primary-foreground font-black tracking-widest text-xs rounded-2xl uppercase hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Get Credits
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-foreground/10 bg-card space-y-3 text-center">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">Create Your Look</p>
                    <p className="text-[11px] text-muted-foreground mt-1">This will use 1 Fit Me Credit.</p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={selectedProducts.length === 0 || loading}
                    className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 uppercase disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Generate Look
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && resultImage && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-3xl overflow-hidden border-2 border-primary shadow-2xl shadow-primary/20">
              <img src={resultImage} alt="Your fit" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 to-transparent">
                <p className="text-xs font-black uppercase tracking-widest text-primary">
                  {selectedProducts.map(p => p.name).join(' + ')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-4 bg-card border border-foreground/10 text-foreground font-black tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:border-foreground/20 transition-all"
              >
                <Download size={16} /> Save
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-4 bg-primary text-primary-foreground font-black tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Sparkles size={16} /> Try Again
              </button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
              {wallet.current_balance} Fit Me {wallet.current_balance === 1 ? 'Credit' : 'Credits'} left
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <FitMeCreditsModal
        open={creditsOpen}
        onClose={() => { setCreditsOpen(false); refreshWallet(); }}
        balance={wallet.current_balance}
      />
    </div>
  );
}
