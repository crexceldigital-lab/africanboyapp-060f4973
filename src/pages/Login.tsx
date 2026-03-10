import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCountry } from '../context/CountryContext';

export default function Login() {
  const { login, signup, countries } = useCountry();
  const [isSignup, setIsSignup] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await login(identifier, password);
    if (!success) setError('Invalid credentials');
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await signup({ full_name: fullName, email, phone_number: phone, password, country_id: 1 });
    if (!success) setError('Signup failed');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black tracking-tighter italic text-primary">AFRICAN BOY</h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.3em]">
            The Official Platform for Jux
          </p>
        </div>

        {!isSignup ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Email or Phone"
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
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-6 py-4 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
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
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>
          </form>
        )}

        <button
          onClick={() => { setIsSignup(!isSignup); setError(''); }}
          className="w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
        >
          {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </motion.div>
    </div>
  );
}
