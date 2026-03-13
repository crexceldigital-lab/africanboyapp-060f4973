import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Check, Zap, Plus, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useCountry } from '../context/CountryContext';
import { supabase } from '@/integrations/supabase/client';

export default function VIP() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTop, setSelectedTop] = useState<Product | null>(null);
  const [selectedBottom, setSelectedBottom] = useState<Product | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const { addToCart } = useCart();
  const { formatPrice } = useCountry();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setProducts(data.map((p: any) => ({
          ...p,
          price: Number(p.price),
          colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
        })));
      }
    };
    fetchProducts();
  }, []);

  const tops = products.filter(p => ['T-Shirt', 'Hoods'].includes(p.category));
  const bottoms = products.filter(p => p.category === 'Jeans');

  const comboPrice = selectedTop && selectedBottom 
    ? (selectedTop.price + selectedBottom.price) * 0.90
    : 0;

  const handleAddComboToCart = () => {
    if (selectedTop && selectedBottom) {
      const comboItem: Product = {
        id: `combo-${Date.now()}`,
        name: `COMBO: ${selectedTop.name} + ${selectedBottom.name}`,
        price: comboPrice,
        category: 'Combo',
        image_url: selectedTop.image_url,
        description: `Exclusive Combo Kit including ${selectedTop.name} and ${selectedBottom.name}.`,
        stock_quantity: 1,
        sizes: [],
        colors: [],
      };
      addToCart(comboItem);
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
        setSelectedTop(null);
        setSelectedBottom(null);
        setCurrentStep(1);
      }, 2000);
    }
  };

  return (
    <div className="pb-24 pt-20 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-block p-4 bg-primary/10 rounded-full mb-4"
        >
          <Zap size={48} className="text-primary" />
        </motion.div>
        <h1 className="text-4xl font-black tracking-tighter italic uppercase">Exclusive <span className="text-primary">Combo Kits</span></h1>
        <p className="text-muted-foreground text-sm mt-2">The ultimate style pairing. Build your look and save.</p>
      </div>

      <section className="pt-4">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-1 bg-primary/10 border border-primary/20 rounded-full mb-4">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Exclusive Deal</span>
          </div>
          <h2 className="text-2xl font-black tracking-tighter italic uppercase">Build Your <span className="text-primary">Custom Bundle</span></h2>
          <p className="text-muted-foreground text-sm mt-2">Combine any Top & Bottom for an automatic 15% discount.</p>
          
          <div className="flex justify-center items-center gap-4 mt-8">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${currentStep === 1 ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-foreground/10 text-muted-foreground'}`}>
              <span className="text-xs font-black">01</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Select Top</span>
            </div>
            <div className="w-8 h-[1px] bg-foreground/10" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${currentStep === 2 ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-foreground/10 text-muted-foreground'}`}>
              <span className="text-xs font-black">02</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Select Bottom</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {currentStep === 1 ? (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Step 1: Choose your Top
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {tops.map(product => (
                      <button
                        key={product.id}
                        onClick={() => { setSelectedTop(product); setCurrentStep(2); }}
                        className={`group relative aspect-[3/4] rounded-3xl overflow-hidden border-2 transition-all ${
                          selectedTop?.id === product.id ? 'border-primary scale-[0.98]' : 'border-foreground/5 hover:border-foreground/20'
                        }`}
                      >
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent flex flex-col justify-end p-4">
                          <p className="text-[10px] font-black uppercase tracking-tighter text-primary mb-1">{product.category}</p>
                          <p className="text-xs font-bold truncate">{product.name}</p>
                        </div>
                        {selectedTop?.id === product.id && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Step 2: Choose your Bottom
                    </h3>
                    <button onClick={() => setCurrentStep(1)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                      ← Back to Tops
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {bottoms.map(product => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedBottom(product)}
                        className={`group relative aspect-[3/4] rounded-3xl overflow-hidden border-2 transition-all ${
                          selectedBottom?.id === product.id ? 'border-primary scale-[0.98]' : 'border-foreground/5 hover:border-foreground/20'
                        }`}
                      >
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent flex flex-col justify-end p-4">
                          <p className="text-[10px] font-black uppercase tracking-tighter text-primary mb-1">{product.category}</p>
                          <p className="text-xs font-bold truncate">{product.name}</p>
                        </div>
                        {selectedBottom?.id === product.id && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Combo Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card border border-foreground/5 rounded-[2rem] p-6 space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                <Crown className="text-primary" size={18} /> Your Combo
              </h3>

              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border transition-all ${selectedTop ? 'border-primary/30 bg-primary/5' : 'border-dashed border-foreground/10'}`}>
                  {selectedTop ? (
                    <div className="flex items-center gap-3">
                      <img src={selectedTop.image_url} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <p className="text-xs font-bold">{selectedTop.name}</p>
                        <p className="text-[10px] text-primary font-bold">{formatPrice(selectedTop.price)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center italic">Select a top</p>
                  )}
                </div>

                <div className="flex justify-center"><Plus size={16} className="text-muted-foreground" /></div>

                <div className={`p-4 rounded-2xl border transition-all ${selectedBottom ? 'border-primary/30 bg-primary/5' : 'border-dashed border-foreground/10'}`}>
                  {selectedBottom ? (
                    <div className="flex items-center gap-3">
                      <img src={selectedBottom.image_url} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <p className="text-xs font-bold">{selectedBottom.name}</p>
                        <p className="text-[10px] text-primary font-bold">{formatPrice(selectedBottom.price)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center italic">Select a bottom</p>
                  )}
                </div>
              </div>

              {selectedTop && selectedBottom && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t border-foreground/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Combo Price</span>
                    <span className="text-xl font-black text-primary">{formatPrice(comboPrice)}</span>
                  </div>
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                      15% Discount Applied
                    </span>
                  </div>
                  <button
                    onClick={handleAddComboToCart}
                    className={`w-full py-4 rounded-2xl font-black tracking-widest text-sm transition-all ${
                      isAdded
                        ? 'bg-emerald-500 text-foreground'
                        : 'bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {isAdded ? (
                      <span className="flex items-center justify-center gap-2"><Check size={18} /> ADDED TO CART</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2"><ShoppingBag size={18} /> ADD COMBO TO CART</span>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
