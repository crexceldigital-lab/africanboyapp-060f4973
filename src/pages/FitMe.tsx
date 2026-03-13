import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Product } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function FitMe() {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'select' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!userImage || selectedProducts.length === 0) return;

    setLoading(true);
    setResultImage(null);

    try {
      const productsPayload = selectedProducts.map(p => ({
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

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.image) {
        setResultImage(data.image);
        setStep('result');
      } else {
        toast.error('Could not generate image. Try a different photo.');
      }
    } catch (err: any) {
      console.error('Fit Me AI error:', err);
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `fit-me-outfit.png`;
    link.click();
  };

  const handleReset = () => {
    setUserImage(null);
    setSelectedProducts([]);
    setSelectedColors({});
    setResultImage(null);
    setStep('upload');
  };

  // Show all products for Fit Me selection
  const clothingProducts = products;

  return (
    <div className="pb-24 pt-20 px-6 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <span className="text-primary text-xs font-bold tracking-widest uppercase">AI Powered</span>
        <h1 className="text-4xl font-black tracking-tighter italic uppercase">
          FIT ME <span className="text-primary">AI</span>
        </h1>
        <p className="text-muted-foreground text-xs mt-2 uppercase tracking-widest">
          Upload your photo • Pick a product • See yourself wearing it
        </p>
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[3/4] max-w-xs mx-auto border-2 border-dashed border-foreground/20 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary transition-all bg-card/50 group w-full"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <Camera size={28} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Tap to upload your photo</p>
                <p className="text-xs text-muted-foreground mt-1">Full body photo works best</p>
              </div>
            </button>
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
            {/* User photo preview */}
            <div className="relative w-32 h-40 mx-auto rounded-2xl overflow-hidden border-2 border-primary">
              <img src={userImage!} alt="Your photo" className="w-full h-full object-cover" />
              <button
                onClick={handleReset}
                className="absolute top-1 right-1 w-6 h-6 bg-background/80 rounded-full flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-black uppercase tracking-tight">Choose your outfit</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                Select up to 5 items ({selectedProducts.length}/5)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {clothingProducts.map(product => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedProducts(prev => prev.filter(p => p.id !== product.id));
                        setSelectedColors(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                      } else if (selectedProducts.length < 5) {
                        setSelectedProducts(prev => [...prev, product]);
                        if (product.colors[0]?.name) {
                          setSelectedColors(prev => ({ ...prev, [product.id]: product.colors[0].name }));
                        }
                      } else {
                        toast.error('You can select up to 5 items');
                      }
                    }}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-primary scale-[1.02] shadow-lg shadow-primary/20'
                        : 'border-foreground/5 hover:border-foreground/20'
                    }`}
                  >
                    <div className="aspect-square">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 bg-card">
                      <p className="text-xs font-bold truncate">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{product.category}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground text-xs">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Color selection for selected products */}
            {selectedProducts.filter(p => p.colors.length > 0).map(product => (
              <div key={product.id} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-center">{product.name} — Color</p>
                <div className="flex justify-center gap-3">
                  {product.colors.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColors(prev => ({ ...prev, [product.id]: color.name }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColors[product.id] === color.name ? 'border-primary scale-125' : 'border-foreground/10'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('upload')}
                className="flex-1 py-4 bg-card border border-foreground/10 text-foreground font-black tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedProducts.length === 0 || loading}
                className="flex-1 py-4 bg-primary text-primary-foreground font-black tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Try It On
                  </>
                )}
              </button>
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
                <p className="text-xs font-black uppercase tracking-widest text-primary">{selectedProduct?.name}</p>
                {selectedColor && (
                  <p className="text-[10px] text-muted-foreground uppercase">{selectedColor}</p>
                )}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
