import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useCountry } from '../context/CountryContext';

export default function AdminLogin() {
  const { user, login, logout } = useCountry();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      logout();
      setError('This account does not have admin access');
    }
  }, [user, logout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login(identifier, password);
    if (!success) {
      setError('Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 text-center"
      >
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-card border border-foreground/10 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-primary text-xs font-bold tracking-widest uppercase">MANAGEMENT</p>
            <h1 className="text-4xl font-black tracking-tighter italic uppercase text-foreground">
              ADMIN <span className="text-primary">PORTAL</span>
            </h1>
            <p className="text-muted-foreground text-[10px] font-extrabold tracking-[0.2em] uppercase pt-1">
              AUTHORIZED PERSONNEL ONLY
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <input
            type="email"
            placeholder="Email"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
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
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <p className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest pt-2">
          This portal is for AFRICAN BOY staff only.
        </p>
      </motion.div>
    </div>
  );
}
