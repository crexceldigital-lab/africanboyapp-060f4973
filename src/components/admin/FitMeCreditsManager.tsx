import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Minus, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatTZS } from '@/lib/fitmeCredits';
import type { FitMeCreditTransaction, FitMeGenerationRecord } from '../../types';

interface AdminStats {
  total_users: number;
  credits_purchased: number;
  credits_used: number;
  credits_refunded: number;
  free_credits_issued: number;
  revenue: number;
  generations: number;
  generations_success: number;
  generations_failed: number;
  estimated_ai_cost: number;
  estimated_gross_margin: number;
}

interface WalletRow {
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  current_balance: number;
  lifetime_credits_purchased: number;
  lifetime_credits_used: number;
  lifetime_free_credits: number;
  generations: number;
}

export default function FitMeCreditsManager() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<WalletRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WalletRow | null>(null);
  const [transactions, setTransactions] = useState<FitMeCreditTransaction[]>([]);
  const [generations, setGenerations] = useState<FitMeGenerationRecord[]>([]);
  const [adjustAmount, setAdjustAmount] = useState('1');
  const [busy, setBusy] = useState(false);

  const loadStats = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc('fitme_admin_stats', {});
    if (!error && data) setStats(data as AdminStats);
  }, []);

  const loadUsers = useCallback(async (q: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('fitme_admin_users', { p_query: q || null });
    if (error) {
      toast.error('Could not load Fit Me users.');
    } else {
      setUsers((data || []) as WalletRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
    loadUsers('');
  }, [loadStats, loadUsers]);

  const openUser = async (row: WalletRow) => {
    setSelected(row);
    const [{ data: tx }, { data: gen }] = await Promise.all([
      (supabase as any)
        .from('fitme_credit_transactions')
        .select('*')
        .eq('user_id', row.user_id)
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('fitme_generations')
        .select('*')
        .eq('user_id', row.user_id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    setTransactions((tx || []) as FitMeCreditTransaction[]);
    setGenerations((gen || []) as FitMeGenerationRecord[]);
  };

  const adjust = async (sign: 1 | -1, type: 'ADMIN_ADJUSTMENT' | 'REFUND' = 'ADMIN_ADJUSTMENT') => {
    if (!selected || busy) return;
    const amount = Math.abs(Number(adjustAmount) || 0);
    if (amount <= 0) return toast.error('Enter how many credits to apply.');

    setBusy(true);
    const { data, error } = await (supabase as any).rpc('fitme_admin_adjust_credits', {
      p_user_id: selected.user_id,
      p_credits: sign * amount,
      p_description: type === 'REFUND' ? 'Manual refund by admin' : 'Manual adjustment by admin',
      p_transaction_type: type,
    });
    setBusy(false);

    if (error) return toast.error(error.message || 'Could not update credits.');
    if (!data?.success) {
      return toast.error(
        data?.reason === 'would_go_negative'
          ? 'That would make the balance negative.'
          : 'No change was made.'
      );
    }

    toast.success(`Balance updated: ${data.current_balance} credits`);
    const updated = { ...selected, current_balance: data.current_balance };
    setSelected(updated);
    setUsers((prev) => prev.map((u) => (u.user_id === updated.user_id ? updated : u)));
    openUser(updated);
    loadStats();
  };

  const statCards: Array<{ label: string; value: string }> = stats
    ? [
        { label: 'Fit Me Users', value: String(stats.total_users) },
        { label: 'Credits Purchased', value: String(stats.credits_purchased) },
        { label: 'Credits Used', value: String(stats.credits_used) },
        { label: 'Credits Refunded', value: String(stats.credits_refunded) },
        { label: 'Free Credits Issued', value: String(stats.free_credits_issued) },
        { label: 'Credit Revenue', value: formatTZS(Number(stats.revenue)) },
        { label: 'Generations', value: String(stats.generations) },
        { label: 'Successful', value: String(stats.generations_success) },
        { label: 'Failed / Refunded', value: String(stats.generations_failed) },
        { label: 'Est. AI Cost', value: formatTZS(Number(stats.estimated_ai_cost)) },
        { label: 'Est. Gross Margin', value: formatTZS(Number(stats.estimated_gross_margin)) },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="p-4 rounded-2xl bg-card border border-foreground/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="text-xl font-black tracking-tighter mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => { e.preventDefault(); loadUsers(query); }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers by name or phone..."
          className="w-full pl-12 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
        />
      </form>

      {/* Users table */}
      <div className="bg-card border border-foreground/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-foreground/5">
              <tr className="text-[9px] uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-3 font-black">Customer</th>
                <th className="px-4 py-3 font-black">Balance</th>
                <th className="px-4 py-3 font-black">Purchased</th>
                <th className="px-4 py-3 font-black">Used</th>
                <th className="px-4 py-3 font-black">Free</th>
                <th className="px-4 py-3 font-black">Looks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="animate-spin text-primary mx-auto" size={20} /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">No customers found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.user_id}
                    onClick={() => openUser(u)}
                    className="border-t border-foreground/5 hover:bg-foreground/5 cursor-pointer text-xs font-bold"
                  >
                    <td className="px-4 py-3">
                      <p>{u.full_name || 'Unnamed customer'}</p>
                      <p className="text-[10px] text-muted-foreground font-normal">{u.phone_number || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-primary">{u.current_balance}</td>
                    <td className="px-4 py-3">{u.lifetime_credits_purchased}</td>
                    <td className="px-4 py-3">{u.lifetime_credits_used}</td>
                    <td className="px-4 py-3">{u.lifetime_free_credits}</td>
                    <td className="px-4 py-3">{u.generations}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer detail */}
      {selected && (
        <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fit Me Wallet</p>
              <p className="text-lg font-black tracking-tighter">{selected.full_name || 'Unnamed customer'}</p>
              <p className="text-xs text-primary font-black">✨ {selected.current_balance} Credits</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              inputMode="numeric"
              className="w-24 px-3 py-2.5 bg-background border border-foreground/10 rounded-xl text-sm font-bold focus:border-primary outline-none"
            />
            <button
              onClick={() => adjust(1)}
              disabled={busy}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1 disabled:opacity-50"
            >
              <Plus size={13} /> Add
            </button>
            <button
              onClick={() => adjust(-1)}
              disabled={busy}
              className="px-4 py-2.5 bg-card border border-foreground/15 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1 disabled:opacity-50"
            >
              <Minus size={13} /> Remove
            </button>
            <button
              onClick={() => adjust(1, 'REFUND')}
              disabled={busy}
              className="px-4 py-2.5 bg-card border border-primary/40 text-primary rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1 disabled:opacity-50"
            >
              <RotateCcw size={13} /> Refund
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Credit transactions</p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {transactions.length === 0 && <p className="text-[11px] text-muted-foreground">No transactions yet.</p>}
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background border border-foreground/5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest">{t.transaction_type.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{t.description || '—'}</p>
                    </div>
                    <span className={`text-xs font-black flex-shrink-0 ${t.credits < 0 ? 'text-muted-foreground' : 'text-primary'}`}>
                      {t.credits > 0 ? `+${t.credits}` : t.credits}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Generation history</p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {generations.length === 0 && <p className="text-[11px] text-muted-foreground">No looks generated yet.</p>}
                {generations.map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background border border-foreground/5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest">{g.generation_status}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {new Date(g.created_at).toLocaleString()}{g.error_message ? ` • ${g.error_message}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
