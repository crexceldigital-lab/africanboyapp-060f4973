import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useCountry } from '../context/CountryContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminLoginProps {
  onSuccess?: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const { login, logout, refreshUser } = useCountry();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login(email, password);
    if (!success) {
      setError('Invalid credentials');
      setLoading(false);
      return;
    }

    // Verify admin role explicitly right after login
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      const isAdmin = roles?.some((r: any) => r.role === 'admin') || false;

      if (!isAdmin) {
        await logout();
        setError('This account does not have admin access');
        setLoading(false);
        return;
      }

      await refreshUser();
      if (onSuccess) onSuccess();
    } else {
      setError('Authentication failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-3">
          <span className="text-primary text-xs font-bold tracking-widest uppercase">MANAGEMENT</span>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-foreground">
            ADMIN <span className="text-primary">PANEL</span>
          </h1>
          <div className="flex items-center justify-center gap-2 pt-1">
            <ShieldCheck className="text-primary w-5 h-5" />
            <span className="text-muted-foreground text-[10px] font-extrabold uppercase tracking-[0.3em]">
              AFRICAN BOY PORTAL
            </span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
            required
          />
          {error && <p className="text-destructive text-xs font-bold text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN TO PORTAL'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
