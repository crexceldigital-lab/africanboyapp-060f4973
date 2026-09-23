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
  const [selectedFootwear, setSelectedFootwear] = useState<Product | null>(null);
  const [topSize, setTopSize] = useState('');
  const [bottomSize, setBottomSize] = useState('');
  const [footwearSize, setFootwearSize] = useState('');
  const [sizeError, setSizeError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const { addComboToCart } = useCart();
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
  const footwear = products.filter(p => p.category === 'Footwear');

  const comboPrice = selectedTop && selectedBottom && selectedFootwear
    ? (selectedTop.price + selectedBottom.price + selectedFootwear.price) * 0.95
    : 0;

  const needsSize = (p: Product | null) => Boolean(p && Array.isArray(p.sizes) && p.sizes.length > 0);
  const sizeMissing =
    (needsSize(selectedTop) && !topSize) ||
    (needsSize(selectedBottom) && !bottomSize) ||
    (needsSize(selectedFootwear) && !footwearSize);

  const handleAddComboToCart = () => {
    if (selectedTop && selectedBottom && selectedFootwear) {
      if (sizeMissing) {
        setSizeError('Please choose a size for each item in your combo.');
        return;
      }
      setSizeError('');
      // Add the three REAL products (with their chosen sizes) so checkout, stock and pricing work.
      // The 5% combo saving is applied as a cart discount.
      addComboToCart([
        { product: selectedTop, size: topSize || undefined },
        { product: selectedBottom, size: bottomSize || undefined },
        { product: selectedFootwear, size: footwearSize || undefined },
      ]);
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
        setSelectedTop(null);
        setSelectedBottom(null);
        setSelectedFootwear(null);
        setTopSize('');
        setBottomSize('');
        setFootwearSize('');
        setCurrentStep(1);
      }, 2000);
    }
  };

  const stepLabels = [
    { num: '01', label: 'Select Top' },
    { num: '02', label: 'Select Bottom' },
    { num: '03', label: 'Select Footwear' },
  ];

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
          <p className="text-muted-foreground text-sm mt-2">Combine any Top, Bottom & Footwear for an automatic 5% discount.</p>
          
          <div className="flex justify-center items-center gap-4 mt-8 flex-wrap">
            {stepLabels.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                {i > 0 && <div className="w-8 h-[1px] bg-foreground/10" />}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${currentStep === i + 1 ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-foreground/10 text-muted-foreground'}`}>
                  <span className="text-xs font-black">{step.num}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Step 1: Choose your Top
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {tops.map(product => (
                      <ProductSelectCard
                        key={product.id}
                        product={product}
                        isSelected={selectedTop?.id === product.id}
                        onSelect={() => { setSelectedTop(product); setTopSize(''); setSizeError(''); setCurrentStep(2); }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              {currentStep === 2 && (
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
                      <ProductSelectCard
                        key={product.id}
                        product={product}
                        isSelected={selectedBottom?.id === product.id}
                        onSelect={() => { setSelectedBottom(product); setBottomSize(''); setSizeError(''); setCurrentStep(3); }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              {currentStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Step 3: Choose your Footwear
                    </h3>
                    <button onClick={() => setCurrentStep(2)} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                      ← Back to Bottoms
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {footwear.map(product => (
                      <ProductSelectCard
                        key={product.id}
                        product={product}
                        isSelected={selectedFootwear?.id === product.id}
                        onSelect={() => { setSelectedFootwear(product); setFootwearSize(''); setSizeError(''); }}
                      />
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
                <ComboSlot item={selectedTop} placeholder="Select a top" formatPrice={formatPrice} size={topSize} onSizeChange={(s) => { setTopSize(s); setSizeError(''); }} />
                <div className="flex justify-center"><Plus size={16} className="text-muted-foreground" /></div>
                <ComboSlot item={selectedBottom} placeholder="Select a bottom" formatPrice={formatPrice} size={bottomSize} onSizeChange={(s) => { setBottomSize(s); setSizeError(''); }} />
                <div className="flex justify-center"><Plus size={16} className="text-muted-foreground" /></div>
                <ComboSlot item={selectedFootwear} placeholder="Select footwear" formatPrice={formatPrice} size={footwearSize} onSizeChange={(s) => { setFootwearSize(s); setSizeError(''); }} />
              </div>

              {selectedTop && selectedBottom && selectedFootwear && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t border-foreground/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Combo Price</span>
                    <span className="text-xl font-black text-primary">{formatPrice(comboPrice)}</span>
                  </div>
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                      5% Discount Applied
                    </span>
                  </div>
                  {sizeError && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-destructive text-center">{sizeError}</p>
                  )}
                  <button
                    onClick={handleAddComboToCart}
                    disabled={sizeMissing && !isAdded}
                    className={`w-full py-4 rounded-2xl font-black tracking-widest text-sm transition-all ${
                      isAdded
                        ? 'bg-emerald-500 text-foreground'
                        : sizeMissing
                          ? 'bg-primary/40 text-primary-foreground cursor-not-allowed'
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

function ProductSelectCard({ product, isSelected, onSelect }: { product: Product; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`group relative aspect-[3/4] rounded-3xl overflow-hidden border-2 transition-all ${
        isSelected ? 'border-primary scale-[0.98]' : 'border-foreground/5 hover:border-foreground/20'
      }`}
    >
      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent flex flex-col justify-end p-4">
        <p className="text-[10px] font-black uppercase tracking-tighter text-primary mb-1">{product.category}</p>
        <p className="text-xs font-bold truncate">{product.name}</p>
      </div>
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
          <Check size={14} strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

function ComboSlot({ item, placeholder, formatPrice, size, onSizeChange }: { item: Product | null; placeholder: string; formatPrice: (n: number) => string; size?: string; onSizeChange?: (size: string) => void }) {
  const sizes = item && Array.isArray(item.sizes) ? item.sizes : [];
  return (
    <div className={`p-4 rounded-2xl border transition-all ${item ? 'border-primary/30 bg-primary/5' : 'border-dashed border-foreground/10'}`}>
      {item ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <img src={item.image_url} className="w-12 h-12 rounded-xl object-cover" />
            <div>
              <p className="text-xs font-bold">{item.name}</p>
              <p className="text-[10px] text-primary font-bold">{formatPrice(item.price)}</p>
            </div>
          </div>
          {sizes.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSizeChange?.(s)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      size === s
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-foreground/10 text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center italic">{placeholder}</p>
      )}
    </div>
  );
}
