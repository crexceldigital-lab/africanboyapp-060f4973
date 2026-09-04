import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, RefreshCcw, Search, X, Check, Star } from 'lucide-react';
import { Product } from '../../types';
import { supabase } from '@/integrations/supabase/client';
import { fromAny } from '@/lib/supabase-helpers';
import { toast } from 'sonner';

export default function ProductOfTheDayPicker() {
  const [currentPick, setCurrentPick] = useState<Product | null>(null);
  const [setDate, setSetDate] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCurrentPick = async () => {
    setLoading(true);
    const { data, error } = await fromAny('product_of_the_day')
      .select('id, product_id, set_for_date, products(*)')
      .order('set_for_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && data.products) {
      const p: any = data.products;
      setCurrentPick({
        ...p,
        price: Number(p.price),
        sale_price: p.sale_price ? Number(p.sale_price) : null,
        colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
      });
      setSetDate(data.set_for_date);
    }
    setLoading(false);
  };

  const fetchAllProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      setProducts(data.map((p: any) => ({
        ...p,
        price: Number(p.price),
        sale_price: p.sale_price ? Number(p.sale_price) : null,
      })));
    }
  };

  useEffect(() => {
    fetchCurrentPick();
    fetchAllProducts();
  }, []);

  const handleSelectProduct = async (product: Product) => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await fromAny('product_of_the_day')
      .insert({
        product_id: product.id,
        set_for_date: today,
      });

    if (error) {
      toast.error('Failed to update Product of the Day');
      return;
    }

    toast.success(`${product.name} set as Product of the Day!`);
    setIsModalOpen(false);
    fetchCurrentPick();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gradient-to-r from-card via-card to-primary/5 border border-primary/20 rounded-[32px] p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Section: Info & Showcase */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-secondary border border-primary/30 flex-shrink-0 overflow-hidden relative shadow-md">
            {currentPick ? (
              <img src={currentPick.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary/40">
                <Flame size={32} />
              </div>
            )}
            <div className="absolute top-1 left-1 bg-primary text-primary-foreground p-1 rounded-lg">
              <Flame size={12} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Star size={12} className="fill-primary" /> PRODUCT OF THE DAY
              </span>
              {setDate && (
                <span className="text-[10px] font-mono text-muted-foreground bg-foreground/5 px-2 py-0.5 rounded-full">
                  {setDate}
                </span>
              )}
            </div>
            {loading ? (
              <p className="text-sm font-bold text-muted-foreground animate-pulse">Loading current pick...</p>
            ) : currentPick ? (
              <>
                <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tight text-foreground">
                  {currentPick.name}
                </h3>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="font-bold text-primary">
                    {currentPick.on_sale
                      ? `${Math.round(currentPick.price - (currentPick.price * (currentPick.discount_percent || 10) / 100)).toLocaleString()} TZS`
                      : `${currentPick.price.toLocaleString()} TZS`}
                  </span>
                  {currentPick.on_sale && (
                    <span className="text-muted-foreground line-through">{currentPick.price.toLocaleString()} TZS</span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-0.5 bg-foreground/5 rounded-md">
                    {currentPick.category}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm font-bold text-muted-foreground">No Product of the Day set yet.</p>
            )}
          </div>
        </div>

        {/* Right Section: Change Button */}
        <button
          onClick={() => {
            fetchAllProducts();
            setIsModalOpen(true);
          }}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg w-full md:w-auto justify-center"
        >
          <RefreshCcw size={16} /> CHANGE PICK
        </button>
      </div>

      {/* Select Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[85vh] bg-card border border-foreground/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-foreground/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black italic uppercase tracking-tight">Select Product of the Day</h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Choose a featured product for today</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-foreground/5 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-6 pb-2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search product by name or category..."
                    className="w-full pl-12 pr-4 py-3 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Product List */}
              <div className="p-6 pt-2 overflow-y-auto no-scrollbar space-y-2 flex-1">
                {filteredProducts.map(p => {
                  const isCurrent = currentPick?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                        isCurrent
                          ? 'bg-primary/10 border-primary'
                          : 'bg-background/40 border-foreground/5 hover:border-primary/50 hover:bg-foreground/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <img src={p.image_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-foreground/10" />
                        <div>
                          <p className="text-sm font-black italic uppercase text-foreground">{p.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{p.category} · {p.price.toLocaleString()} TZS</p>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-[9px] font-black uppercase flex items-center gap-1">
                          <Check size={12} /> ACTIVE PICK
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                          Select
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
