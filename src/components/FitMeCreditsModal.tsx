import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  FitMeCreditPackage,
  fetchPackages,
  startCreditPurchase,
  pricePerCredit,
  formatTZS,
} from '@/lib/fitmeCredits';
import { trackFitMe } from '@/lib/analytics';

interface Props {
  open: boolean;
  onClose: () => void;
  balance: number;
}

export default function FitMeCreditsModal({ open, onClose, balance }: Props) {
  const [packages, setPackages] = useState<FitMeCreditPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchPackages()
      .then(setPackages)
      .finally(() => setLoading(false));

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone_number')
        .eq('id', auth.user.id)
        .maybeSingle();
      if (profile?.phone_number) setPhone(profile.phone_number);
      if (profile?.full_name) setName(profile.full_name);
    })();
  }, [open]);

  const handleBuy = async (pkg: FitMeCreditPackage) => {
    if (buying) return;
    if (!phone.trim() || phone.trim().replace(/\D/g, '').length < 9) {
      toast.error('Enter the mobile money number to pay with.');
      return;
    }

    setBuying(pkg.id);
    trackFitMe('fitme_credit_purchase_started', {
      package: pkg.code,
      credits: pkg.credits,
      value: pkg.price,
      currency: pkg.currency,
    });

    try {
      const result = await startCreditPurchase(pkg, { name, phone });
      window.location.href = result.checkout_url;
    } catch (err: any) {
      trackFitMe('fitme_credit_purchase_failed', { package: pkg.code, reason: err?.message });
      toast.error(err?.message || 'Could not start the payment.');
      setBuying(null);
    }
  };

  const paidPackages = packages.filter((p) => !p.is_free);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-background/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-card border border-primary/20 rounded-t-3xl sm:rounded-3xl p-6 space-y-6 shadow-2xl shadow-primary/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-primary text-[10px] font-bold tracking-widest uppercase">Fit Me Wallet</span>
                <h2 className="text-2xl font-black tracking-tighter italic uppercase">
                  GET <span className="text-primary">CREDITS</span>
                </h2>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {balance > 0
                    ? `You have ${balance} Fit Me ${balance === 1 ? 'Credit' : 'Credits'} left.`
                    : 'Get more credits to continue creating your looks.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center flex-shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Mobile money number
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                inputMode="tel"
                className="w-full px-4 py-3 bg-background border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
              />
            </div>

            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="animate-spin text-primary" size={22} />
              </div>
            ) : (
              <div className="space-y-3">
                {paidPackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handleBuy(pkg)}
                    disabled={Boolean(buying)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all disabled:opacity-60 ${
                      pkg.badge
                        ? 'border-primary/60 bg-primary/5 hover:border-primary'
                        : 'border-foreground/10 bg-background hover:border-foreground/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black uppercase tracking-widest">{pkg.name}</p>
                          {pkg.badge && (
                            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest">
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-primary font-bold mt-1">
                          {pkg.credits} Fit Me Credits
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatTZS(pricePerCredit(pkg))} per credit
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-black">{formatTZS(pkg.price)}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1 justify-end mt-1">
                          {buying === pkg.id ? (
                            <>
                              <Loader2 size={11} className="animate-spin" /> Opening
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} /> Get credits
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Credits are added to your wallet only after your payment is confirmed.
              1 credit = 1 new look. A failed look is refunded automatically.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
