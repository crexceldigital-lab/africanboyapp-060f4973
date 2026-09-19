import { useState } from 'react';
import { CreditCard, Banknote, Smartphone, Plus, Trash2, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useCountry } from '@/context/CountryContext';
import { toast } from 'sonner';

export interface PaymentLine {
  id: string;
  payment_method: string;
  amount: number;
  reference?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onCompleteSale: (payments: PaymentLine[]) => Promise<void>;
  processing: boolean;
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { id: 'airtel_money', label: 'Airtel Money', icon: Smartphone, color: 'text-red-500 bg-red-600/10 border-red-600/20' },
  { id: 'mixx', label: 'Mixx by Yas', icon: Smartphone, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { id: 'halopesa', label: 'HaloPesa', icon: Smartphone, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'card', label: 'Card (POS)', icon: CreditCard, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
  { id: 'other', label: 'Other', icon: CreditCard, color: 'text-muted-foreground bg-foreground/5 border-foreground/10' },
];

export default function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onCompleteSale,
  processing,
}: PaymentModalProps) {
  const { formatPrice, selectedCountry } = useCountry();

  const [payments, setPayments] = useState<PaymentLine[]>([
    { id: '1', payment_method: 'cash', amount: totalAmount, reference: '' },
  ]);

  // Cash change calculator fields
  const [cashReceivedInput, setCashReceivedInput] = useState<string>(String(totalAmount));

  if (!isOpen) return null;

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingDue = Math.max(0, totalAmount - totalPaid);

  // Active payment method (from first line)
  const isSingleCash = payments.length === 1 && payments[0].payment_method === 'cash';
  const cashReceived = Number(cashReceivedInput) || 0;
  const changeDue = isSingleCash ? Math.max(0, cashReceived - totalAmount) : 0;

  const handleMethodSelect = (methodId: string) => {
    if (payments.length === 1) {
      setPayments([{ id: '1', payment_method: methodId, amount: totalAmount, reference: '' }]);
    }
  };

  const handleUpdatePayment = (index: number, key: keyof PaymentLine, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [key]: value };
    setPayments(updated);
  };

  const handleAddSplitPayment = () => {
    const newRem = Math.max(0, totalAmount - totalPaid);
    setPayments([
      ...payments,
      { id: crypto.randomUUID(), payment_method: 'mpesa', amount: newRem, reference: '' },
    ]);
  };

  const handleRemoveSplitPayment = (index: number) => {
    if (payments.length <= 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    // Validation
    if (totalPaid < totalAmount) {
      return toast.error(`Insufficient payment total. ${formatPrice(remainingDue)} remaining.`);
    }

    if (isSingleCash && cashReceived < totalAmount) {
      return toast.error('Amount received is below the amount due.');
    }

    // Reference validation for digital payments
    for (const p of payments) {
      if (p.payment_method !== 'cash' && !p.reference?.trim()) {
        return toast.error(`Payment reference/transaction ID required for ${p.payment_method.toUpperCase()}`);
      }
    }

    await onCompleteSale(payments);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-foreground/10 rounded-[32px] w-full max-w-lg p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
          <div>
            <h3 className="font-black text-xl italic uppercase">Process Checkout</h3>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Select payment method & record transaction
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Total Summary Header */}
        <div className="p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
              Total Amount Due
            </span>
            <span className="text-3xl font-black text-primary italic tracking-tight">
              {formatPrice(totalAmount)}
            </span>
          </div>
          {isSingleCash && cashReceived >= totalAmount && (
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                Change to Return
              </span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {formatPrice(changeDue)}
              </span>
            </div>
          )}
        </div>

        {/* Payment Methods Grid */}
        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Payment Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const isSelected = payments.some((p) => p.payment_method === m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMethodSelect(m.id)}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/15 text-primary scale-105 shadow-md'
                      : 'border-foreground/10 bg-background hover:border-foreground/20 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-black uppercase tracking-wider text-center">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Calculation UI if Single Cash */}
        {isSingleCash && (
          <div className="space-y-4 p-4 bg-foreground/5 rounded-2xl border border-foreground/5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                  Amount Received
                </label>
                <input
                  type="number"
                  value={cashReceivedInput}
                  onChange={(e) => setCashReceivedInput(e.target.value)}
                  className="w-full px-4 py-3 bg-card border border-foreground/10 rounded-xl text-lg font-black font-mono focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                  Calculated Change
                </label>
                <div className="w-full px-4 py-3 bg-card border border-foreground/10 rounded-xl text-lg font-black font-mono text-emerald-400">
                  {formatPrice(changeDue)}
                </div>
              </div>
            </div>

            {/* Cash Presets */}
            <div className="flex gap-2">
              {[totalAmount, Math.ceil(totalAmount / 10000) * 10000, Math.ceil(totalAmount / 50000) * 50000].map(
                (preset, idx) =>
                  preset >= totalAmount && (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashReceivedInput(String(preset))}
                      className="flex-1 py-1.5 bg-card border border-foreground/10 hover:border-primary rounded-lg text-xs font-mono font-bold transition-all"
                    >
                      {formatPrice(preset)}
                    </button>
                  )
              )}
            </div>
          </div>
        )}

        {/* Split Payments List */}
        {!isSingleCash && (
          <div className="space-y-3 border-t border-foreground/5 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Payment Breakdown
              </label>
              <button
                type="button"
                onClick={handleAddSplitPayment}
                className="text-xs font-black uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Payment
              </button>
            </div>

            {payments.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2 bg-card p-3 rounded-2xl border border-foreground/10">
                <select
                  value={p.payment_method}
                  onChange={(e) => handleUpdatePayment(idx, 'payment_method', e.target.value)}
                  className="px-3 py-2 bg-background border border-foreground/10 rounded-xl text-xs font-bold focus:border-primary outline-none"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) => handleUpdatePayment(idx, 'amount', Number(e.target.value) || 0)}
                  placeholder="Amount"
                  className="w-32 px-3 py-2 bg-background border border-foreground/10 rounded-xl text-xs font-mono font-bold focus:border-primary outline-none"
                />

                {p.payment_method !== 'cash' && (
                  <input
                    type="text"
                    value={p.reference || ''}
                    onChange={(e) => handleUpdatePayment(idx, 'reference', e.target.value)}
                    placeholder="Ref # (e.g. QX99201)"
                    className="flex-1 px-3 py-2 bg-background border border-foreground/10 rounded-xl text-xs font-mono focus:border-primary outline-none"
                  />
                )}

                {payments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSplitPayment(idx)}
                    className="p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            <div className="flex justify-between items-center text-xs font-bold pt-2">
              <span className="text-muted-foreground">Total Paid: {formatPrice(totalPaid)}</span>
              {remainingDue > 0 ? (
                <span className="text-destructive font-black">Remaining: {formatPrice(remainingDue)}</span>
              ) : (
                <span className="text-emerald-400 font-black">Fully Paid ✓</span>
              )}
            </div>
          </div>
        )}

        {/* Digital Payment Reference for Single Payment */}
        {payments.length === 1 && payments[0].payment_method !== 'cash' && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
              Transaction Reference / Ref Number <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={payments[0].reference || ''}
              onChange={(e) => handleUpdatePayment(0, 'reference', e.target.value)}
              placeholder="e.g. QX98102381 or Mobile Money Ref"
              required
              className="w-full px-4 py-3 bg-card border border-foreground/10 rounded-xl text-sm font-mono font-bold focus:border-primary outline-none uppercase"
            />
          </div>
        )}

        {/* Confirm Action Button */}
        <div className="pt-2">
          <button
            onClick={handleConfirm}
            disabled={processing || (remainingDue > 0 && !isSingleCash)}
            className="w-full py-4 bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={20} />
            {processing ? 'PROCESSING TRANSACTION...' : `COMPLETE SALE (${formatPrice(totalAmount)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
