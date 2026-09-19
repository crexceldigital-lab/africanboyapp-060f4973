import { useState } from 'react';
import { Percent, DollarSign, X, Check, ShieldAlert } from 'lucide-react';
import { useCountry } from '@/context/CountryContext';
import { toast } from 'sonner';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  currentDiscount: { type: 'percent' | 'fixed' | 'none'; value: number; amount: number };
  onApplyDiscount: (discount: { type: 'percent' | 'fixed' | 'none'; value: number; amount: number }) => void;
  staffRole?: string; // 'sales_rep', 'store_manager', 'admin'
}

export default function DiscountModal({
  isOpen,
  onClose,
  subtotal,
  currentDiscount,
  onApplyDiscount,
  staffRole = 'sales_rep',
}: DiscountModalProps) {
  const { formatPrice, selectedCountry } = useCountry();
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(
    currentDiscount.type === 'fixed' ? 'fixed' : 'percent'
  );
  const [inputValue, setInputValue] = useState<string>(
    currentDiscount.value > 0 ? String(currentDiscount.value) : ''
  );

  if (!isOpen) return null;

  const isManagerOrAdmin = staffRole === 'store_manager' || staffRole === 'admin';
  const MAX_PERCENT_REP = 15; // Sales rep maximum discount limit

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(inputValue) || 0;

    if (val <= 0) {
      onApplyDiscount({ type: 'none', value: 0, amount: 0 });
      onClose();
      return;
    }

    let calculatedAmount = 0;

    if (discountType === 'percent') {
      if (val > 100) {
        return toast.error('Percentage discount cannot exceed 100%');
      }
      if (!isManagerOrAdmin && val > MAX_PERCENT_REP) {
        return toast.error(`Sales reps can apply maximum ${MAX_PERCENT_REP}% discount. Manager approval required for higher discounts.`);
      }
      calculatedAmount = Math.round((subtotal * val) / 100);
    } else {
      if (val > subtotal) {
        return toast.error('Fixed discount cannot exceed cart subtotal');
      }
      const percentEquivalent = (val / subtotal) * 100;
      if (!isManagerOrAdmin && percentEquivalent > MAX_PERCENT_REP) {
        return toast.error(`Sales reps can apply maximum ${MAX_PERCENT_REP}% equivalent discount (Max ${formatPrice(Math.round((subtotal * MAX_PERCENT_REP)/100))}).`);
      }
      calculatedAmount = val;
    }

    onApplyDiscount({
      type: discountType,
      value: val,
      amount: calculatedAmount,
    });

    toast.success(`Discount of ${formatPrice(calculatedAmount)} applied.`);
    onClose();
  };

  const handleRemove = () => {
    onApplyDiscount({ type: 'none', value: 0, amount: 0 });
    toast.success('Discount removed');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-foreground/10 rounded-[32px] w-full max-w-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Percent size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg italic uppercase">Apply Discount</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Subtotal: {formatPrice(subtotal)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Permission Info */}
        {!isManagerOrAdmin && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2 text-amber-500 text-xs font-bold">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <span>Sales staff limit: Max {MAX_PERCENT_REP}% discount allowed.</span>
          </div>
        )}

        <form onSubmit={handleApply} className="space-y-4">
          {/* Discount Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-foreground/5 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setDiscountType('percent')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                discountType === 'percent'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Percent size={14} /> Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                discountType === 'fixed'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <DollarSign size={14} /> Fixed ({selectedCountry?.currency_code || 'TZS'})
            </button>
          </div>

          {/* Quick Preset Pills */}
          {discountType === 'percent' && (
            <div className="flex gap-2">
              {[5, 10, 15, 20, 25].map((p) => {
                const disabled = !isManagerOrAdmin && p > MAX_PERCENT_REP;
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={disabled}
                    onClick={() => setInputValue(String(p))}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      inputValue === String(p)
                        ? 'border-primary bg-primary/10 text-primary'
                        : disabled
                        ? 'opacity-40 border-foreground/5 text-muted-foreground cursor-not-allowed'
                        : 'border-foreground/10 hover:border-foreground/20 text-foreground'
                    }`}
                  >
                    {p}%
                  </button>
                );
              })}
            </div>
          )}

          {/* Value Input */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
              Discount Value {discountType === 'percent' ? '(%)' : `(${selectedCountry?.currency_code || 'TZS'})`}
            </label>
            <input
              type="number"
              min="0"
              step={discountType === 'percent' ? '1' : '500'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 5000'}
              className="w-full px-5 py-3.5 bg-card border border-foreground/10 rounded-2xl text-lg font-black focus:border-primary outline-none font-mono"
            />
          </div>

          {/* Live Preview */}
          {Number(inputValue) > 0 && (
            <div className="p-4 bg-foreground/5 rounded-2xl space-y-1 text-xs font-bold">
              <div className="flex justify-between text-muted-foreground">
                <span>Original Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-primary">
                <span>Discount Amount:</span>
                <span>
                  -
                  {formatPrice(
                    discountType === 'percent'
                      ? Math.round((subtotal * Number(inputValue)) / 100)
                      : Number(inputValue)
                  )}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-foreground/10 font-black text-sm text-foreground">
                <span>New Total:</span>
                <span>
                  {formatPrice(
                    Math.max(
                      0,
                      subtotal -
                        (discountType === 'percent'
                          ? Math.round((subtotal * Number(inputValue)) / 100)
                          : Number(inputValue))
                    )
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {currentDiscount.type !== 'none' && (
              <button
                type="button"
                onClick={handleRemove}
                className="py-3.5 px-4 bg-destructive/10 text-destructive font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-destructive hover:text-destructive-foreground transition-all"
              >
                Remove
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Check size={16} /> Apply Discount
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
